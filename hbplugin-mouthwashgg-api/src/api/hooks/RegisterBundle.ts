import { BaseGamemodePlugin } from "../BaseGamemodePlugin";

const mouthwashRegisteredBundlesKey = Symbol("mouthwash:registeredBundles");

export function RegisterBundle(bundleLocation: string) {
    return function<T extends typeof BaseGamemodePlugin>(gamemodeCtr: T) {
        const cachedRoles = Reflect.getMetadata(mouthwashRegisteredBundlesKey, gamemodeCtr);
        const registeredBundles: string[] = cachedRoles || [];
        if (!cachedRoles) {
            Reflect.defineMetadata(mouthwashRegisteredBundlesKey, registeredBundles, gamemodeCtr);
        }

        registeredBundles.push(bundleLocation);
        
        return gamemodeCtr;
    }
}

export function getRegisteredBundles(gamemodeCtr: typeof BaseGamemodePlugin): string[] {
    return Reflect.getMetadata(mouthwashRegisteredBundlesKey, gamemodeCtr) || [];
}