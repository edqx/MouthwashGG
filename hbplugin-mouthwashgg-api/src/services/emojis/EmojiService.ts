export class Emoji {
    constructor(
        public readonly name: string,
        public readonly sprite: number
    ) {}

    toString() {
        return "<sprite index=" + this.sprite + ">";
    }
}

export const Emojis = {
    crewmate: new Emoji("crewmate", 0),
    crewalign: new Emoji("crewalign", 1),
    neutalign: new Emoji("neutalign", 2),
    impoalign: new Emoji("impoalign", 3),
    impostor: new Emoji("impostor", 4),
    grenadier: new Emoji("grenadier", 5),
    jester: new Emoji("jester", 6),
    engineer: new Emoji("engineer", 7),
    oracle: new Emoji("oracle", 8),
    phantom: new Emoji("phantom", 9),
    serialkiller: new Emoji("serialkiller", 10),
    snitch: new Emoji("snitch", 11),
    sheriff: new Emoji("sheriff", 12),
    impervious: new Emoji("impervious", 13),
    locksmith: new Emoji("locksmith", 14),
    swooper: new Emoji("swooper", 15),
    partner: new Emoji("partner", 16),
    skeld: new Emoji("skeld", 17),
    mira: new Emoji("mira", 18),
    polus: new Emoji("polus", 19),
    submerged: new Emoji("submerged", 20),
    morphling: new Emoji("morphling", 21),
    airship: new Emoji("airship", 22),
    poisoner: new Emoji("poisoner", 23),
    platItch: new Emoji("platItch", 24),
    platGoogle: new Emoji("platGoogle", 25),
    platSteam: new Emoji("platSteam", 26),
    platEpic: new Emoji("platEpic", 27),
    platIOS: new Emoji("platIOS", 28),
    platUnknown: new Emoji("platUnknown", 29),
    mentor: new Emoji("mentor", 30),
    identitythief: new Emoji("identitythief", 31)
};

export class EmojiService {
    static getEmoji(name: keyof typeof Emojis) {
        return Emojis[name];
    }
}