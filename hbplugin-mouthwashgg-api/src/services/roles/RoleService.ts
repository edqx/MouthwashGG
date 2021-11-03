import { EventListener, PlayerData, ReliablePacket, Room } from "@skeldjs/hindenburg";
import { DisplayStartGameScreenMessage, HudLocation, NumberValue } from "mouthwash-types";

import { shuffleArray } from "../../util/shuffleArray";

import {
    Crewmate,
    BaseRole,
    Impostor,
    RoleAlignment,
    RoleCtr,
    RoleStringNames,
    StartGameScreen,
    ListenerType,
    getRoleEventListeners
} from "../../api";

import { MouthwashApiPlugin } from "../../plugin";
import { DefaultRoomOptionName } from "../gameOptions";

export interface RoleCount {
    role: typeof BaseRole;
    playerCount: number;
}

export interface RoleAssignment {
    player: PlayerData<Room>;
    role: typeof BaseRole;
}

export class RoleService {
    playerRoles: WeakMap<PlayerData, BaseRole>;

    constructor(
        public readonly plugin: MouthwashApiPlugin
    ) {
        this.playerRoles = new WeakMap;
    }

    getPlayerRole(player: PlayerData) {
        return this.playerRoles.get(player);
    }
    
    static adjustImpostorCount(playerCount: number): number {
        if (playerCount <= 6) {
            return 1;
        }

        if (playerCount <= 8) {
            return 2;
        }

        return 3;
    }

    getRoleAssignments(roleCounts: RoleCount[]): RoleAssignment[] {
        if (this.plugin.room.players.size === 0)
            return [];

        const impostorAligned: typeof BaseRole[] = [];
        const otherAligned: typeof BaseRole[] = [];
        
        shuffleArray(roleCounts);

        for (const roleCount of roleCounts) {
            for (let i = 0; i < roleCount.playerCount; i++) {
                if (roleCount.role.metadata.alignment === RoleAlignment.Impostor) {
                    impostorAligned.push(roleCount.role);
                } else {
                    otherAligned.push(roleCount.role);
                }
            }
        }
        
        const players = [];
        for (const [ , player ] of this.plugin.room.players) {
            players.push(player);
        }
        
        shuffleArray(players);
        
        const impostorCount = RoleService.adjustImpostorCount(this.plugin.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorCount)?.getValue<NumberValue>().value || 0);

        this.plugin.room.setSettings({
            numImpostors: impostorCount
        });

        const roleAssignments: RoleAssignment[] = [];

        for (let i = 0; i < impostorCount; i++) {
            roleAssignments.push({
                player: players[i],
                role: impostorAligned[i] || Impostor
            });
        }

        for (let i = 0; i < players.length - impostorCount; i++) {
            roleAssignments.push({
                player: players[impostorCount + i],
                role: otherAligned[i] || Crewmate
            })
        }

        return roleAssignments;
    }

    async assignAllRoles(roleAssignments: RoleAssignment[]) {
        const impostorCount = roleAssignments.reduce((acc, rol) => rol.role.metadata.alignment === RoleAlignment.Impostor ? acc + 1 : acc, 0);

        const assignPromises = [];

        for (const roleAssignment of roleAssignments) {
            assignPromises.push(this.assignRoleInitial(
                roleAssignment.player,
                roleAssignment.role,
                roleAssignments,
                impostorCount
            ));
        }

        const roles = await Promise.all(assignPromises);

        const readyPromises = [];
        for (const role of roles) {
            this.plugin.nameService.addEmojiFor(
                role.player,
                role.metadata.emoji,
                [ role.player ]
            );
            this.plugin.hudService.addHudStringFor(
                HudLocation.TaskText,
                RoleStringNames.TaskObjective,
                role.getHudText(),
                [ role.player ]
            );
            readyPromises.push(role.onReady());
        }

        await Promise.all(readyPromises);
    }
    
    async sendStartGameScreen(player: PlayerData, startGameScreen: StartGameScreen) {
        const connection = this.plugin.room.connections.get(player.clientId);
        if (connection) {
            const teamPlayers = Array.isArray(startGameScreen.teamPlayers)
                ? startGameScreen.teamPlayers
                : [];

            if (!Array.isArray(startGameScreen.teamPlayers)) {
                for (const [ , player ] of this.plugin.room.players) {
                    const playerRole = this.playerRoles.get(player);
                    if (playerRole && playerRole.metadata.alignment === startGameScreen.teamPlayers) {
                        teamPlayers.push(player);
                    }
                }
            }

            const teamPlayerIds = [];
            for (const player of teamPlayers) {
                const playerId = player.playerId;
                if (playerId !== undefined) {
                    teamPlayerIds.push(playerId);
                }
            }

            await connection.sendPacket(
                new ReliablePacket(
                    connection.getNextNonce(),
                    [
                        new DisplayStartGameScreenMessage(
                            startGameScreen.titleText,
                            startGameScreen.subtitleText,
                            startGameScreen.backgroundColor,
                            teamPlayerIds
                        )
                    ]
                )
            );
        }
    }

    async assignRoleInitial<T extends RoleCtr<K>, K extends BaseRole>(player: PlayerData<Room>, role: T, roleAssignments: RoleAssignment[], impostorCount: number): Promise<K> {
        const roleInstance = this.assignRole(player, role) as K;

        const startGameScreen = roleInstance.getStartGameScreen(roleAssignments, impostorCount);
        await this.sendStartGameScreen(player, startGameScreen);

        return roleInstance;
    }

    assignRole<T extends RoleCtr<K>, K extends BaseRole>(player: PlayerData<Room>, role: T): K {
        const cachedRole = this.playerRoles.get(player);
        if (cachedRole) {
            this.removeRole(cachedRole);
        }

        const roleInstance = new role(player);
        this.playerRoles.set(player, roleInstance);

        const eventListeners = getRoleEventListeners(roleInstance);
        for (const listener of eventListeners) {
            const fn = listener.handler.bind(roleInstance);
            if (listener.type === ListenerType.Room) {
                this.plugin.room.on(listener.eventName, fn);
            } else {
                player.on(listener.eventName, fn);
            }
            roleInstance.registeredEventListeners.push({
                type: listener.type,
                eventName: listener.eventName,
                handler: fn
            });
        }

        return roleInstance;
    }

    removeRole(role: BaseRole) {
        for (const event of role.registeredEventListeners) {
            if (event.type === ListenerType.Room) {
                this.plugin.room.off(event.eventName, event.handler);
            } else {
                role.player.off(event.eventName, event.handler);
            }
        }
    }
}