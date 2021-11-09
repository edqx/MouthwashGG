import {
    HazelReader,
    HazelWriter,
    Hostable,
    MeetingHud,
    MeetingHudClearVoteEvent,
    MeetingHudVoteCastEvent,
    PlayerData,
    PlayerVoteArea,
    SpawnType,
    VoteStateSpecialId
} from "@skeldjs/hindenburg";

export class MouthwashVoteState<RoomType extends Hostable = Hostable> extends PlayerVoteArea<RoomType> {
    constructor(
        public readonly meetinghud: MeetingHud<RoomType>,
        public playerId: number,
        public votedForId: number,
        public isDead: boolean,
        public isDisabled: boolean,
        public didReport: boolean
    ) {
        super(meetinghud, playerId, votedForId, didReport);
    }

    static Deserialize<RoomType extends Hostable = Hostable>(reader: HazelReader, meetinghud: MeetingHud<RoomType>, playerId: number) {
        const votedForId = reader.uint8();
        const isDead = reader.bool();
        const isDisabled = reader.bool();
        const didReport = reader.bool();
        return new MouthwashVoteState(meetinghud, playerId, votedForId, isDead, isDisabled, didReport);
    }

    Serialize(writer: HazelWriter) {
        writer.uint8(this.votedForId);
        writer.bool(this.isDead);
        writer.bool(this.isDisabled);
        writer.bool(this.didReport);
    }

    setDead(isDead: boolean) {
        this.isDead = isDead;
        this.dirty = true;
    }

    setDisabled(isDisabled: boolean) {
        this.isDisabled = isDisabled;
        this.dirty = true;
    }
}

export interface MouthwashMeetingHudData {
    voteStates: Map<number, MouthwashVoteState>;
    tie?: boolean;
    exilied?: PlayerData;
}

export class MouthwashMeetingHud<RoomType extends Hostable = Hostable> extends MeetingHud<RoomType> {
    voteStates: Map<number, MouthwashVoteState<RoomType>>;

    constructor(
        room: RoomType,
        spawnType: SpawnType,
        netId: number,
        ownerId: number,
        flags: number,
        data?: HazelReader | MouthwashMeetingHudData
    ) {
        super(room, spawnType, netId, ownerId, flags, data);

        this.voteStates ||= new Map;
    }

    Awake() {
        if (this.room.gameData) {
            this.voteStates = new Map(
                [...this.room.gameData.players]
                    .filter(([, player]) => player.playerId !== undefined)
                    .map(([, player]) => {
                        return [
                            player.playerId,
                            new MouthwashVoteState(
                                this,
                                player.playerId,
                                VoteStateSpecialId.NotVoted,
                                player.isDead,
                                player.isDisconnected,
                                false
                            ),
                        ];
                    }));
        }

        this.ranOutOfTimeTimeout = setTimeout(() => {
            for (const [ , voteState ] of this.voteStates) {
                if (voteState.votedForId === 255) {
                    voteState.setMissed();
                }
            }

            this.checkForVoteComplete(true);
        }, 8000 + this.room.settings.discussionTime * 1000 + this.room.settings.votingTime * 1000);
    }

    Deserialize(reader: HazelReader, spawn: boolean) {
        if (spawn) {
            this.dirtyBit = 0;
            this.voteStates = new Map;
        }

        const numVotes = reader.packed();
        for (let i = 0; i < numVotes; i++) {
            const [ playerId, mreader ] = reader.message();
            const player = this.room.getPlayerByPlayerId(playerId);

            if (!player)
                continue;

            const oldState = this.voteStates.get(playerId);
            const newState = MouthwashVoteState.Deserialize(mreader, this, playerId);

            this.voteStates.set(playerId, newState);

            if (!oldState?.hasVoted && newState.hasVoted) {
                this.emit(
                    new MeetingHudVoteCastEvent(
                        this.room,
                        this,
                        undefined,
                        player,
                        newState.votedFor
                    )
                );
            } else if (oldState?.votedFor && !newState.hasVoted) {
                this.emit(
                    new MeetingHudClearVoteEvent(
                        this.room,
                        this,
                        undefined,
                        player
                    )
                );
            }
        }
    }
}