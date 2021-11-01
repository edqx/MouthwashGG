export class Bitfield {
    constructor(
        private _value: number
    ) {}

    get value() {
        return this._value;
    }

    equals(other: Bitfield) {
        return this.value === other.value;
    }

    has(flag: number) {
        return (this._value & (1 << flag)) > 0;
    }

    set(flag: number, on: boolean) {
        if (on) {
            this._value |= (1 << flag);
        } else {
            this._value &= ~(1 << flag);
        }
        return this;
    }

    on(flag: number) {
        return this.set(flag, true);
    }

    off(flag: number) {
        return this.set(flag, false);
    }

    toggle(flag: number) {
        return this.set(flag, !this.has(flag));
    }
}