import {
    PlayerData,
    PlayerDieEvent,
    PlayerMoveEvent,
    PlayerSnapToEvent,
    PlayerStartMeetingEvent,
    Room,
    RoomFixedUpdateEvent,
    Vector2
} from "@skeldjs/hindenburg";

import {
    AssetReference,
    BaseRole,
    Button,
    ButtonFixedUpdateEvent,
    DeadBodyController,
    DeadBodyDestroyEvent,
    DeadBodySpawnEvent,
    EmojiService,
    EventListener,
    ListenerType,
    MouthwashRole,
    RoleAlignment,
    RoleGameOption,
    RoleObjective,
    RoleStringNames
} from "hbplugin-mouthwashgg-api";

import {
    GameOption,
    HudLocation,
    KeyCode,
    NumberValue,
    Palette,
    Priority,
    RGBA
} from "mouthwash-types";

import { TownOfPolusOptionName } from "../gamemode";

const identityThiefColor = new RGBA(146, 33, 82, 255);

export const IdentityThiefOptionName = {
    IdentityThiefStealingTime: `${identityThiefColor.text("Identity Thief")} Stealing time`
} as const;

@MouthwashRole("Identity Thief", RoleAlignment.Neutral, identityThiefColor, EmojiService.getEmoji("identitythief"))
@RoleObjective("Steal someone's identity and complete their objective")
export class IdentityThief extends BaseRole {
    static getGameOptions(gameOptions: Map<string, GameOption>) {
        const roleOptions = new Map<any, any>([]);

        const identityThiefProbability = gameOptions.get(TownOfPolusOptionName.IdentityThiefProbability);
        if (identityThiefProbability && identityThiefProbability.getValue<NumberValue>().value > 0) {
            roleOptions.set(IdentityThiefOptionName.IdentityThiefStealingTime, new RoleGameOption(IdentityThiefOptionName.IdentityThiefStealingTime, new NumberValue(5, 1, 0, 10, false, "{0}s")));
        }

        return roleOptions as Map<string, RoleGameOption>;
    }
    
    private _stealingTime: number;
    private _stealingRole?: BaseRole;

    private _target?: [ DeadBodyController, PlayerData ];
    
    private _waitDuration: number;
    private _originalColor?: [ RGBA, RGBA ];
    private _stealTarget?: [ DeadBodyController, PlayerData ];

    private _stealButton?: Button;
    private _lastSaturateTime: number;
    
    deadBodies: [ DeadBodyController, PlayerData ][];

    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);

        this._stealingTime = this.api.gameOptions.gameOptions.get(IdentityThiefOptionName.IdentityThiefStealingTime)?.getValue<NumberValue>().value ?? 5;
        this._waitDuration = Infinity;
        this._lastSaturateTime = 0;

        this.deadBodies = [];
    }

    async onReady() {
        await this.giveFakeTasks();
        
        this._stealButton = await this.spawnButton(
            "steal-button",
            new AssetReference("PggResources/TownOfPolus", "Assets/Mods/TownOfPolus/Steal.png"),
            {
                maxTimer: 60,
                isCountingDown: true,
                saturated: false,
                currentTime: 10,
                keys: [ KeyCode.Q ]
            }
        );

        this._stealButton?.on("mwgg.button.click", ev => {
            if (!this._target || !this._stealButton || this._stealButton.currentTime > 0 || this.player.info?.isDead)
                return;
            
            const stealRole = this.api.roleService.getPlayerRole(this._target[1]);
            if (stealRole) {
                this._stealTarget = this._target;
                this._stealingRole = stealRole;
                this._originalColor = [ this._target[0].deadBody.color, this._target[0].deadBody.shadowColor ];

                if (this._stealingTime < 0.5) {
                    this._waitDuration = 0;
                    this._giveRole();
                    return;
                }

                this._stealButton.setMaxTimer(this._stealingTime);
                this._stealButton.setCurrentTime(this._stealingTime);
                this._waitDuration = this._stealingTime * 1000;
            }
        });
    }

    async onRemove() {
        this._cancelSteal();
        this._stealButton?.destroy();
        this._stealButton = undefined;
    }

    private _cancelSteal() {
        if (this._stealTarget && this._originalColor) {
            const deadBody = this._stealTarget[0].deadBody;
            
            deadBody.setColor(this._originalColor[0]);
            deadBody.setShadowColor(this._originalColor[1]);
        }

        this._waitDuration = Infinity;
        this._stealingRole = undefined;
        this._stealTarget = undefined;
        this._stealButton?.setCurrentTime(0);
    }

    private async _giveRole() {
        this._saturateBody();
        this._stealButton?.destroy();
        this._stealButton = undefined;
        this._stealTarget = undefined;
        this._waitDuration = Infinity;
        const stealingRole = this._stealingRole;
        this._stealingRole = undefined;
        await this.api.roleService.removeRole(this.player);
        const role = await this.api.roleService.assignRole(this.player, (stealingRole as any).constructor);
        this.api.hudService.setHudStringFor(
            HudLocation.TaskText,
            RoleStringNames.TaskObjective,
            `${identityThiefColor.text("Role: Identity Thief")}\n${role.metadata.themeColor.text("Stolen role: " + role.metadata.roleName + "\n" + role.metadata.roleObjective)}`,
            Priority.A,
            [ role.player ]
        );
        this.api.nameService.removeEmojiFor(this.player, EmojiService.getEmoji("identitythief"), [ this.player ]);
        this.api.nameService.addEmojiFor(role.player, role.metadata.emoji, [ role.player ]);
        await role.onReady();
    }

    private _saturateBody() {
        if (!this._stealTarget || !this._originalColor)
            return;

        const curDate = Date.now();
        const saturateDelta = curDate - this._lastSaturateTime;
        if (saturateDelta >= 500) {
            const deadBody = this._stealTarget[0].deadBody;
            this._lastSaturateTime = curDate;
            const percentage = 0.5 + (this._waitDuration / (this._stealingTime * 1000) / 2); // go from 0.5-1.0

            const saturatePrimary = this._originalColor[0].saturate(percentage);
            const saturateShadow = this._originalColor[1].saturate(percentage);

            deadBody.setColor(saturatePrimary);
            deadBody.setShadowColor(saturateShadow);
        }
    }
    
    @EventListener("player.die", ListenerType.Player)
    async onPlayerDie(ev: PlayerDieEvent) {
        this._stealButton?.destroy();
    }

    @EventListener("mwgg.button.fixedupdate", ListenerType.Room)
    async onButtonFixedUpdate(ev: ButtonFixedUpdateEvent) {
        if (!this.player.transform)
            return;

        let nearestDist = Infinity;
        let nearestPlayerBody = undefined;
        for (let i = 0; i < this.deadBodies.length; i++) {
            const deadBody = this.deadBodies[i];
            const dist = deadBody[0].customNetworkTransform.position.dist(this.player.transform.position);
            if (dist < 0.5 && dist < nearestDist) {
                nearestDist = dist;
                nearestPlayerBody = deadBody;
            }
        }

        this._target = nearestPlayerBody;
        this._stealButton?.setSaturated(!!this._target);
    }

    @EventListener("room.fixedupdate", ListenerType.Room)
    async onFixedUpdate(ev: RoomFixedUpdateEvent) {
        if (!this._stealTarget || !this._stealButton || !this._stealingRole)
            return;
            
        this._waitDuration -= ev.delta;

        if (this._waitDuration <= 0) {
            await this._giveRole();
            return;
        }

        this._saturateBody();
    }

    @EventListener("player.snapto", ListenerType.Player)
    onPlayerSnapTo(ev: PlayerSnapToEvent) {
        if (this._waitDuration >= Infinity)
            return;

        this._cancelSteal();
    }

    @EventListener("player.move", ListenerType.Player)
    onPlayerMove(ev: PlayerMoveEvent) {
        if (!this._stealTarget || this._target === this._stealTarget)
            return;

        this._cancelSteal();
    }

    @EventListener("player.startmeeting", ListenerType.Room)
    async onStartMeeting(ev: PlayerStartMeetingEvent) {
        if (this._waitDuration >= Infinity)
            return;

        this._cancelSteal();
    }

    @EventListener("mwgg.deadbody.spawn", ListenerType.Room)
    async onDeadBodySpawn(ev: DeadBodySpawnEvent) {
        const player = ev.deadBody.getPlayer();
        if (player) {
            this.deadBodies.push([ ev.deadBody, player ]);
        }
    }

    @EventListener("mwgg.deadbody.destroy", ListenerType.Room)
    async onDeadBodyDestroy(ev: DeadBodyDestroyEvent) {
        const idx = this.deadBodies.findIndex(([ bodyControl ]) =>
            bodyControl.deadBody === ev.deadBody);

        if (idx > 0) {
            this.deadBodies.splice(idx, 1);
        }
    }
}