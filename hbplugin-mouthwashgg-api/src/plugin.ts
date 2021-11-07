import {
    ClientLeaveEvent,
    Connection,
    EventListener,
    Room,
    RoomPlugin,
    HindenburgPlugin,
    PlayerSendChatEvent,
    PlayerJoinEvent,
    PlayerLeaveEvent,
    PlayerData,
    PlayerCheckNameEvent,
    RoomSelectImpostorsEvent,
    RoomGameStartEvent,
    GameMap,
    sleep,
    RoomFixedUpdateEvent,
    PlayerDieEvent,
    RoomEndGameIntentEvent,
    AmongUsEndGames,
    EndGameIntent,
    GameOverReason,
    PlayerInfo,
    PlayersDisconnectEndgameMetadata,
    PlayersVoteOutEndgameMetadata,
    RoomGameEndEvent,
    ReliablePacket,
    RpcMessage,
    SetInfectedMessage,
    TaskBarUpdate,
    KillDistance
} from "@skeldjs/hindenburg";

import {
    GameOption,
    EnumValue,
    NumberValue,
    BooleanValue,
    FetchResponseType,
    HudLocation,
    Palette,
    Priority,
    OverwriteGameOver,
    WinSound
} from "mouthwash-types";

import {
    AnimationService,
    AssetLoaderService,
    ButtonService,
    CameraControllerService,
    ChatService,
    DefaultRoomOptionName,
    DefaultRoomCategoryName,
    GameOptionsService,
    HudService,
    NameService,
    QrCodeService,
    RoleService,
    SoundService,
    SpoofInfoService,
    AssetBundle,
    AnyTaskbarUpdate,
    AnyImpostorKillDistance,
    AccountService
} from "./services";

import {
    ButtonFixedUpdateEvent,
    ClientFetchResourceResponseEvent,
    MouthwashUpdateGameOptionEvent
} from "./events";

import {
    BaseGamemodePlugin,
    EndGameScreen,
    getRegisteredBundles,
    getRegisteredRoles,
    isMouthwashGamemode,
    MouthwashEndGames,
    RoleAlignment
} from "./api";

const mapNameToNumber = {
    "The Skeld": GameMap.TheSkeld,
    "MiraHQ": GameMap.MiraHQ,
    "Polus": GameMap.Polus,
    "Airship": GameMap.Airship,
};

const taskBarUpdateNameToNumber = {
    "Always": TaskBarUpdate.Always,
    "Meetings": TaskBarUpdate.Meetings,
    "Never": TaskBarUpdate.Never
};

const killDistanceNameToNumber = {
    "Short": KillDistance.Short,
    "Medium": KillDistance.Medium,
    "Long": KillDistance.Long
};

@HindenburgPlugin("hbplugin-mouthwashgg-api", "1.0.0", "last")
export class MouthwashApiPlugin extends RoomPlugin {
    accountService: AccountService;
    animationService: AnimationService;
    assetLoader: AssetLoaderService;
    buttonService: ButtonService;
    cameraControllers: CameraControllerService;
    chatService: ChatService;
    gameOptions: GameOptionsService;
    hudService: HudService;
    nameService: NameService;
    qrCodeService: QrCodeService;
    roleService: RoleService;
    soundService: SoundService;
    spoofInfo: SpoofInfoService;

    gamemode?: BaseGamemodePlugin;

    allGamemodes: Map<string, typeof BaseGamemodePlugin>;

    roomCreator?: Connection;

    constructor(
        public readonly room: Room,
        public readonly config: any
    ) {
        super(room, config);

        this.accountService = new AccountService(this);
        this.animationService = new AnimationService(this);
        this.assetLoader = new AssetLoaderService(this);
        this.buttonService = new ButtonService(this);
        this.cameraControllers = new CameraControllerService(this);
        this.chatService = new ChatService(this);
        this.gameOptions = new GameOptionsService(this);
        this.hudService = new HudService(this);
        this.nameService = new NameService(this);
        this.qrCodeService = new QrCodeService(this);
        this.roleService = new RoleService(this);
        this.soundService = new SoundService(this);
        this.spoofInfo = new SpoofInfoService;

        this.allGamemodes = new Map;
    }
    
    getConnections(players: PlayerData[]|undefined) {
        return players
            ? players
                .map(player => this.room.connections.get(player.clientId))
                .filter(_ => _) as Connection[]
            : undefined;
    }

    async onPluginLoad() {
        if (!this.room.config.serverAsHost)
            this.room.setSaaHEnabled(true);

        for (const [ , importedPlugin ] of this.worker.pluginLoader.roomPlugins) {
            if (isMouthwashGamemode(importedPlugin)) {
                const gamemodePlugin = importedPlugin as typeof BaseGamemodePlugin;
                this.allGamemodes.set(gamemodePlugin.gamemodeMetadata.name, gamemodePlugin);
            }
        }

        await this.assetLoader.loadGlobalAsset();
    }

    createDefaultOptions() {
        return new Map<string, GameOption>([
            [DefaultRoomOptionName.Map, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.Map, new EnumValue([ "The Skeld", "Polus", "Mira HQ", "Airship" ], 0), Priority.A)],
            [DefaultRoomOptionName.ImpostorCount, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.ImpostorCount, new NumberValue(2, 1, 1, 3, false, "{0} Impostors"), Priority.A + 1)],
            [DefaultRoomOptionName.MaxPlayerCount, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.MaxPlayerCount, new NumberValue(15, 1, 4, 15, false, "{0} Players"), Priority.A + 2)],
            [DefaultRoomOptionName.PlayerSpeed, new GameOption(DefaultRoomCategoryName.None, DefaultRoomOptionName.PlayerSpeed, new NumberValue(1.25, 0.25, 0.25, 3, false, "{0}x"), Priority.A + 3)],
            [DefaultRoomOptionName.AnonymousVotes, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.AnonymousVotes, new BooleanValue(false), Priority.B)],
            [DefaultRoomOptionName.ConfirmEjects, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.ConfirmEjects, new BooleanValue(false), Priority.B + 1)],
            [DefaultRoomOptionName.DiscussionTime, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.DiscussionTime, new NumberValue(15, 15, 0, 300, false, "{0}s"), Priority.B + 2)],
            [DefaultRoomOptionName.VotingTime, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.VotingTime, new NumberValue(150, 30, 0, 300, true, "{0}s"), Priority.B + 3)],
            [DefaultRoomOptionName.EmergencyCooldown, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.EmergencyCooldown, new NumberValue(20, 5, 0, 60, false, "{0}s"), Priority.B + 4)],
            [DefaultRoomOptionName.EmergencyMeetings, new GameOption(DefaultRoomCategoryName.Meetings, DefaultRoomOptionName.EmergencyMeetings, new NumberValue(1, 1, 0, 9, false, "{0} Buttons"), Priority.B + 5)],
            [DefaultRoomOptionName.VisualTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.VisualTasks, new BooleanValue(false), Priority.C)],
            [DefaultRoomOptionName.TaskBarUpdates, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.TaskBarUpdates, new EnumValue(["Always", "Meetings", "Never"], 0), Priority.C + 1)],
            [DefaultRoomOptionName.CommonTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.CommonTasks, new NumberValue(1, 1, 0, 2, false, "{0} tasks"), Priority.C + 2)],
            [DefaultRoomOptionName.LongTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.LongTasks, new NumberValue(2, 1, 0, 3, false, "{0} tasks"), Priority.C + 3)],
            [DefaultRoomOptionName.ShortTasks, new GameOption(DefaultRoomCategoryName.Tasks, DefaultRoomOptionName.ShortTasks, new NumberValue(3, 1, 0, 5, false, "{0} tasks"), Priority.C + 4)],
            [DefaultRoomOptionName.CrewmateVision, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.CrewmateVision, new NumberValue(0.75, 0.25, 0.25, 3, false, "{0}x"), Priority.D)],
            [DefaultRoomOptionName.ImpostorVision, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.ImpostorVision, new NumberValue(0.75, 0.25, 0.25, 3, false, "{0}x"), Priority.D + 1)],
            [DefaultRoomOptionName.ImpostorKillCooldown, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.ImpostorKillCooldown, new NumberValue(30, 2.5, 5, 60, false, "{0}s"), Priority.D + 2)],
            [DefaultRoomOptionName.ImpostorKillDistance, new GameOption(DefaultRoomCategoryName.Roles, DefaultRoomOptionName.ImpostorKillDistance, new EnumValue(["Short", "Medium", "Long"], 1), Priority.D + 3)]
        ]);
    }

    async setGamemode(gamemodePluginCtr: typeof BaseGamemodePlugin, doTransition: boolean) {
        if (this.gamemode) {
            this.worker.pluginLoader.unloadPlugin(this.gamemode, this.room);
        }

        const gamemodePlugin = await this.worker.pluginLoader.loadPlugin(gamemodePluginCtr, this.room) as BaseGamemodePlugin;

        const registeredRoles = getRegisteredRoles(gamemodePluginCtr);
        for (const registeredRole of registeredRoles) {
            gamemodePlugin.registeredRoles.push(registeredRole);
        }

        const registeredBundles = getRegisteredBundles(gamemodePluginCtr);
        const promises = [];
        for (const registeredBundle of registeredBundles) {
            promises.push(AssetBundle.loadFromUrl(registeredBundle, false));
        }
        gamemodePlugin.registeredBundles = await Promise.all(promises);

        this.gamemode = gamemodePlugin;
        if (doTransition) {
            await this.doGameOptionTransition();
        }
    }

    async doGameOptionTransition() {
        if (this.gamemode) {
            let help = 0;
            while (true) {
                const newGameOptions = this.gamemode.getGameOptions();

                let i = 0;
                for (const registeredRole of this.gamemode.registeredRoles) {
                    const roleOptions = registeredRole.getGameOptions(this.gameOptions.gameOptions);
                    let j = 0;
                    for (const [ key, option ] of roleOptions) {
                        newGameOptions.set(key, new GameOption(DefaultRoomCategoryName.Config, option.key, option.value, Priority.F + i * 100 + j));
                        j++;
                    }
                    i++;
                }

                for (const [ , option ] of newGameOptions) {
                    const cachedValue = this.gameOptions.getCachedValue(option);
                    if (cachedValue) {
                        option.setValue(cachedValue);
                    }
                }

                if (!await this.gameOptions.transitionTo(newGameOptions))
                    break;

                help++;
                if (help >= 5) {
                    this.logger.warn("2 options with the same names in 2 different categories likely have the same name and is causing an infinite loop, breaking..")
                    break;
                }
            }
        }
    }

    updateDefaultSettings() {
        this.room.setSettings({
            map: mapNameToNumber[this.gameOptions.gameOptions.get(DefaultRoomOptionName.Map)?.getValue<EnumValue<keyof typeof mapNameToNumber>>().selectedOption || "The Skeld"],
            numImpostors: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorCount)?.getValue<NumberValue>().value,
            maxPlayers: this.gameOptions.gameOptions.get(DefaultRoomOptionName.MaxPlayerCount)?.getValue<NumberValue>().value,
            playerSpeed: this.gameOptions.gameOptions.get(DefaultRoomOptionName.PlayerSpeed)?.getValue<NumberValue>().value,
            anonymousVotes: this.gameOptions.gameOptions.get(DefaultRoomOptionName.AnonymousVotes)?.getValue<BooleanValue>().enabled,
            confirmEjects: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ConfirmEjects)?.getValue<BooleanValue>().enabled,
            discussionTime: this.gameOptions.gameOptions.get(DefaultRoomOptionName.DiscussionTime)?.getValue<NumberValue>().value,
            votingTime: this.gameOptions.gameOptions.get(DefaultRoomOptionName.VotingTime)?.getValue<NumberValue>().value,
            emergencyCooldown: this.gameOptions.gameOptions.get(DefaultRoomOptionName.EmergencyCooldown)?.getValue<NumberValue>().value,
            numEmergencies: this.gameOptions.gameOptions.get(DefaultRoomOptionName.EmergencyMeetings)?.getValue<NumberValue>().value,
            visualTasks: this.gameOptions.gameOptions.get(DefaultRoomOptionName.VisualTasks)?.getValue<BooleanValue>().enabled,
            taskbarUpdates: taskBarUpdateNameToNumber[this.gameOptions.gameOptions.get(DefaultRoomOptionName.TaskBarUpdates)?.getValue<EnumValue<AnyTaskbarUpdate>>().selectedOption || "Always"],
            commonTasks: this.gameOptions.gameOptions.get(DefaultRoomOptionName.CommonTasks)?.getValue<NumberValue>().value,
            longTasks: this.gameOptions.gameOptions.get(DefaultRoomOptionName.LongTasks)?.getValue<NumberValue>().value,
            shortTasks: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ShortTasks)?.getValue<NumberValue>().value,
            crewmateVision: this.gameOptions.gameOptions.get(DefaultRoomOptionName.CrewmateVision)?.getValue<NumberValue>().value,
            impostorVision: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorVision)?.getValue<NumberValue>().value,
            killCooldown: this.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorKillCooldown)?.getValue<NumberValue>().value,
            killDistance: killDistanceNameToNumber[this.gameOptions.gameOptions.get(DefaultRoomOptionName.ImpostorKillDistance)?.getValue<EnumValue<AnyImpostorKillDistance>>().selectedOption || "Medium"]
        });
    }

    @EventListener("player.join")
    async onPlayerJoin(ev: PlayerJoinEvent<Room>) {
        const connection = ev.room.connections.get(ev.player.clientId);

        if (!connection)
            return;
            
        await this.assetLoader.assertLoaded(
            connection,
            this.assetLoader.globalAssets!
        );
    }

    @EventListener("client.leave")
    async onClientLeave(ev: ClientLeaveEvent) {
        if (ev.client === this.roomCreator) {
            const connectionUser = await this.accountService.getConnectionUser(ev.client);
            if (connectionUser) {
                const gameSettings: any = {};
                for (const [ gameOptionPath, gameOptionValue ] of this.gameOptions.cachedValues) {
                    gameSettings[gameOptionPath] = gameOptionValue.toJSON();
                }
                await this.accountService.updateUserSettings(connectionUser.client_id, gameSettings);
            }
        }
    }

    @EventListener("player.leave")
    async onPlayerLeave(ev: PlayerLeaveEvent<Room>) {
        const connection = this.room.connections.get(ev.player.clientId);

        if (!connection)
            return;

        this.cameraControllers.despawnCamera(ev.player);
        this.buttonService.despawnAllButtons(ev.player);
    }

    @EventListener("player.checkname")
    async onCheckName(ev: PlayerCheckNameEvent<Room>) {
        ev.cancel();

        if (ev.player.info) {
            ev.player.info.name = ev.alteredName;
        }

        await this.nameService.updateAllNames();
        
        const connection = ev.room.connections.get(ev.player.clientId);

        if (!connection)
            return;

        if (!this.roomCreator)
            this.roomCreator = connection;

        if (ev.player.isHost) {
            const connectionUser = await this.accountService.getConnectionUser(connection);

            if (connectionUser) {
                const keys = Object.keys(connectionUser.game_settings);
                for (let i = 0; i < keys.length; i++) {
                    const gameOptionPath = keys[i];
                    const gameOptionValue = connectionUser.game_settings[gameOptionPath];

                    if (gameOptionValue.type === "enum") {
                        const gameOption = new EnumValue<string>(gameOptionValue.options, gameOptionValue.selectedIdx);
                        this.gameOptions.cachedValues.set(gameOptionPath, gameOption);
                    } else if (gameOptionValue.type === "boolean") {
                        const gameOption = new BooleanValue(gameOptionValue.enabled);
                        this.gameOptions.cachedValues.set(gameOptionPath, gameOption);
                    } else if (gameOptionValue.type === "number") {
                        const gameOption = new NumberValue(
                            gameOptionValue.value,
                            gameOptionValue.step,
                            gameOptionValue.lower,
                            gameOptionValue.upper,
                            gameOptionValue.zeroIsInfinity,
                            gameOptionValue.suffix,
                        );
                        this.gameOptions.cachedValues.set(gameOptionPath, gameOption);
                    }
                }
            }

            const gamemodeOption = await this.gameOptions.createOption(
                new GameOption(
                    DefaultRoomCategoryName.None,
                    DefaultRoomOptionName.Gamemode,
                    new EnumValue([...this.allGamemodes.keys()], 0),
                    Priority.A
                )
            );

            const selectedGamemode = this.allGamemodes.get(gamemodeOption.getValue<EnumValue<string>>()!.selectedOption);

            if (selectedGamemode) {
                await this.setGamemode(selectedGamemode, true);
            }

            this.updateDefaultSettings();
        } else {
            this.gameOptions.syncFor(connection);
        }
        
        await this.cameraControllers.spawnCameraFor(ev.player);
        
        if (this.room["actingHostWaitingFor"] === ev.player) {
            if (this.room.actingHostsEnabled) {
                for (const actingHostId of this.room.actingHostIds) {
                    const actingHostConn = this.room.connections.get(actingHostId);
                    if (actingHostConn) {
                        await this.room.updateHost(actingHostId, actingHostConn);
                    }
                }
            }
            this.room["actingHostWaitingFor"] = undefined;
        }
    }

    @EventListener("room.fixedupdate")
    async onRoomFixedUpdate(ev: RoomFixedUpdateEvent<Room>) {
        const players = [];
        for (const [ , player ] of this.room.players) {
            players.push(player);
        }
        await this.room.emit(new ButtonFixedUpdateEvent(players));
    }

    @EventListener("mwgg.gameoption.update")
    async onGameOptionUpdate(ev: MouthwashUpdateGameOptionEvent) {
        if (ev.optionKey === DefaultRoomOptionName.Gamemode) {
            const newValue = ev.getNewValue<EnumValue<string>>().selectedOption;
            if (ev.getOldValue<EnumValue<string>>().selectedOption !== newValue) {
                await this.setGamemode(this.allGamemodes.get(newValue)!, false);
            }
        }

        if (ev.optionKey === DefaultRoomOptionName.PlayerSpeed || ev.optionKey === DefaultRoomOptionName.MaxPlayerCount) {
            this.updateDefaultSettings();
        }

        if (this.gamemode) {
            await this.doGameOptionTransition();
        }
    }

    @EventListener("mwgg.client.fetchresponse")
    onFetchResponse(ev: ClientFetchResourceResponseEvent) {
        const assetBundle = this.assetLoader.getWaitingFor(ev.client).get(ev.resourceId);

        if (!assetBundle)
            return;

        if (ev.response.responseType === FetchResponseType.Failed) {
            this.logger.warn("Failed to load asset bundle %s for %s (%s)",
                assetBundle.url, ev.client, ev.response.reason);
            return ev.client.disconnect("Failed to load asset bundle: " + assetBundle.url + " (" + ev.response.reason + ")"); // todo: report these somehow
        }

        if (ev.response.responseType === FetchResponseType.Invalid) {
            this.logger.warn("Invalid asset bundle hash for %s for %s (%s)",
                assetBundle.url, ev.client, assetBundle.fileHash);
            return ev.client.disconnect("Invalid asset bundle hash: " + assetBundle.url + " (" + assetBundle.fileHash + ")");
        }

        if (ev.response.responseType === FetchResponseType.Ended) {
            this.assetLoader.onLoaded(ev.client, assetBundle);
        }
    }

    @EventListener("player.chat")
    async onPlayerChat(ev: PlayerSendChatEvent<Room>) {
        if (ev.message?.canceled)
            return;

        ev.message?.cancel();

        const recipients = this.chatService.getStandardRecipients(ev.player);
        const appearance = this.chatService.getStandardAppearance(ev.player, false);
        const chatMessage = this.chatService.createMessageFor(ev.chatMessage, appearance, ev.player, recipients);

        await this.chatService.broadcastMessage(chatMessage);
    }

    @EventListener("room.selectimpostors")
    async onSelectImpostors(ev: RoomSelectImpostorsEvent<Room>) {
        ev.cancel();
        if (this.room.host?.control) {
            await this.room.broadcast([
                new RpcMessage(
                    this.room.host.control.netId,
                    new SetInfectedMessage([])
                )
            ]);
        }
    }

    @EventListener("room.gamestart")
    async onGameStart(ev: RoomGameStartEvent) {
        this.updateDefaultSettings();

        if (this.gamemode) {
            const promises = [];
            for (const [ , connection ] of this.room.connections) {
                for (const assetBundle of this.gamemode.registeredBundles) {
                    await this.assetLoader.assertLoaded(connection, assetBundle);
                    promises.push(this.assetLoader.waitForLoaded(connection, assetBundle));
                }
            }
            await Promise.all(promises);
        }

        sleep(500).then(async () => {
            const roleAssignments = this.roleService.getRoleAssignments(this.gamemode?.getRoleCounts() || []);
            await this.roleService.assignAllRoles(roleAssignments);
        });
    }

    @EventListener("room.endgameintent")
    onEndGameIntent(ev: RoomEndGameIntentEvent<Room>) {
        if (!ev.metadata.endGameScreen) {
            ev.cancel();
            
            const players: PlayerInfo<Room>[] = [];
            if (this.room.gameData) {
                for (const [ , player ] of this.room.gameData.players) {
                    if (player.playerId !== undefined) {
                        players.push(player);
                    }
                }
            }

            if (ev.intentName === AmongUsEndGames.O2Sabotage || ev.intentName === AmongUsEndGames.ReactorSabotage) {
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        MouthwashEndGames.SystemSabotage,
                        GameOverReason.ImpostorBySabotage,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                                return [
                                    player.playerId,
                                    {
                                        titleText: player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: `${Palette.impostorRed.text("Impostors")} won by sabotage`,
                                        backgroundColor: Palette.impostorRed,
                                        winSound: WinSound.ImpostorWin,
                                        hasWon: player.isImpostor
                                    }
                                ];
                            }))
                        }
                    )
                );
            } else if (ev.intentName === AmongUsEndGames.PlayersDisconnect) {
                const metadata = ev.metadata as PlayersDisconnectEndgameMetadata;
                if (metadata.aliveImpostors === 0) {
                    this.room.registerEndGameIntent(
                        new EndGameIntent(
                            MouthwashEndGames.ImpostorsDisconnected,
                            GameOverReason.ImpostorDisconnect,
                            {
                                endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                                    return [
                                        player.playerId,
                                        {
                                            titleText: !player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                            subtitleText: `All ${Palette.impostorRed.text("Impostors")} disconnected`,
                                            backgroundColor: Palette.crewmateBlue,
                                            winSound: WinSound.CrewmateWin,
                                            hasWon: !player.isImpostor
                                        }
                                    ];
                                }))
                            }
                        )
                    );
                } else {
                    this.room.registerEndGameIntent(
                        new EndGameIntent(
                            MouthwashEndGames.CrewmatesDisconnected,
                            GameOverReason.HumansDisconnect,
                            {
                                endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                                    return [
                                        player.playerId,
                                        {
                                            titleText: player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                            subtitleText: `${Palette.crewmateBlue.text("Crewmates")} disconnected`,
                                            backgroundColor: Palette.impostorRed,
                                            winSound: WinSound.ImpostorWin,
                                            hasWon: player.isImpostor
                                        }
                                    ];
                                }))
                            }
                        )
                    );
                }
            } else if (ev.intentName === AmongUsEndGames.PlayersKill) {
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        MouthwashEndGames.ImpostorsKilledCrewmates,
                        GameOverReason.ImpostorByKill,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                                return [
                                    player.playerId,
                                    {
                                        titleText: player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: `The ${Palette.impostorRed.text("Impostors")} killed all of the ${Palette.crewmateBlue.text("Crewmates")}`,
                                        backgroundColor: Palette.impostorRed,
                                        winSound: WinSound.ImpostorWin,
                                        hasWon: player.isImpostor
                                    }
                                ];
                            }))
                        }
                    )
                );
            } else if (ev.intentName === AmongUsEndGames.PlayersVoteOut) {
                const metadata = ev.metadata as PlayersVoteOutEndgameMetadata;
                if (metadata.exiled.info?.isImpostor) {
                    this.room.registerEndGameIntent(
                        new EndGameIntent(
                            MouthwashEndGames.CrewmateVotedOut,
                            GameOverReason.ImpostorByVote,
                            {
                                endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                                    return [
                                        player.playerId,
                                        {
                                            titleText: player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                            subtitleText: `The ${Palette.impostorRed.text("Impostors")} voted out the last ${Palette.crewmateBlue.text("Crewmate")}`,
                                            backgroundColor: Palette.impostorRed,
                                            winSound: WinSound.ImpostorWin,
                                            hasWon: player.isImpostor
                                        }
                                    ];
                                }))
                            }
                        )
                    );
                } else {
                    this.room.registerEndGameIntent(
                        new EndGameIntent(
                            MouthwashEndGames.ImpostorVotedOut,
                            GameOverReason.HumansByVote,
                            {
                                endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                                    return [
                                        player.playerId,
                                        {
                                            titleText: !player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                            subtitleText: `The ${Palette.crewmateBlue.text("Crewmates")} voted out all of the ${Palette.impostorRed.text("Impostors")}`,
                                            backgroundColor: Palette.crewmateBlue,
                                            winSound: WinSound.CrewmateWin,
                                            hasWon: !player.isImpostor
                                        }
                                    ];
                                }))
                            }
                        )
                    );
                }
            } else if (ev.intentName === AmongUsEndGames.TasksComplete) {
                this.room.registerEndGameIntent(
                    new EndGameIntent(
                        MouthwashEndGames.CrewmatesCompletedTasks,
                        GameOverReason.HumansByTask,
                        {
                            endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                                return [
                                    player.playerId,
                                    {
                                        titleText: !player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                        subtitleText: `The ${Palette.crewmateBlue.text("Crewmates")} completed all of the tasks`,
                                        backgroundColor: Palette.crewmateBlue,
                                        winSound: WinSound.CrewmateWin,
                                        hasWon: !player.isImpostor
                                    }
                                ];
                            }))
                        }
                    )
                );
            }
        }
    }

    @EventListener("room.gameend")
    async onGameEnd(ev: RoomGameEndEvent) {
        const intent = ev.intent as EndGameIntent<{ endGameScreen: Map<number, EndGameScreen> }>|undefined;

        if (!intent)
            return;

        if (!intent.metadata?.endGameScreen)
            return;

        const rolePlayers: Record<RoleAlignment, number[]> = {
            [RoleAlignment.Crewmate]: [],
            [RoleAlignment.Neutral]: [],
            [RoleAlignment.Impostor]: []
        }

        for (const [ , player ] of this.room.players) {
            if (player.playerId === undefined)
                continue;

            const playerRole = this.roleService.getPlayerRole(player);
            if (!playerRole)
                continue;
            
            if (playerRole.metadata.alignment === RoleAlignment.Crewmate) {
                rolePlayers[RoleAlignment.Crewmate].push(player.playerId);
            } else if (playerRole.metadata.alignment === RoleAlignment.Neutral) {
                rolePlayers[RoleAlignment.Neutral].push(player.playerId);
            } else if (playerRole.metadata.alignment === RoleAlignment.Impostor) {
                rolePlayers[RoleAlignment.Impostor].push(player.playerId);
            }
        }

        const promises = [];
        for (const [ , player ] of this.room.players) {
            if (player.playerId === undefined) {
                // do something if the player id is null
                continue;
            }
            
            const playerRole = this.roleService.getPlayerRole(player);
            const endGame = intent.metadata.endGameScreen.get(player.playerId);
            if (!endGame)
                continue;

            const connection = this.room.connections.get(player.clientId);
            if (!connection)
                return;

            const yourTeam = typeof endGame.yourTeam === "undefined"
                ? playerRole ? rolePlayers[playerRole.metadata.alignment] : []
                : typeof endGame.yourTeam === "number"
                    ? rolePlayers[endGame.yourTeam]
                    : endGame.yourTeam
                        .reduce<number[]>((acc, player) => {
                            if (player.playerId !== undefined)
                                acc.push(player.playerId);
                            
                            return acc;
                        }, []);

            promises.push(
                connection.sendPacket(
                    new ReliablePacket(
                        connection.getNextNonce(),
                        [
                            new OverwriteGameOver(
                                endGame.titleText,
                                endGame.subtitleText,
                                endGame.backgroundColor,
                                yourTeam || [],
                                true,
                                true,
                                typeof endGame.winSound === "number"
                                    ? endGame.winSound
                                    : WinSound.CustomSound,
                                typeof endGame.winSound === "number"
                                    ? 0
                                    : endGame.winSound.assetId
                            )
                        ]
                    )
                )
            );
        }
        await Promise.all(promises);

        await Promise.all([
            this.hudService.resetAllHuds(),
            this.nameService.resetAllNames(),
            this.roleService.removeAllRoles()
        ]);
    }

    @EventListener("player.die")
    async onPlayerDie(ev: PlayerDieEvent<Room>) {
        const playerHud = this.hudService.getPlayerHud(ev.player);
        const cachedTaskText = playerHud.hudStrings.get(HudLocation.TaskText);
        const taskText = cachedTaskText || [];
        if (!cachedTaskText) {
            playerHud.hudStrings.set(HudLocation.TaskText, taskText);
        }
        
        const youDied = Palette.impostorRed.text("You're dead");

        const fakeTasksIdx = taskText.findIndex(([ key ]) => key === "fake-tasks");
        if (fakeTasksIdx > -1) {
            taskText.splice(fakeTasksIdx, 0, ["you-died-text", youDied, 999]);
        } else {
            taskText.push(["you-died-text", youDied, 999]);
        }

        this.hudService.updateHudString(HudLocation.TaskText, ev.player, playerHud);
    }
}