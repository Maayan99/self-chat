export type VarRead = ConvoVars['read'];
export type VarAppend = ConvoVars['append'];

export class ConvoVars {
    private vars: {[name: string]: any}

    constructor() {
        this.vars = {}
    }

    /**
     * Appends a new key-value pair to the conversation variables.
     * @param key The key to be added or updated.
     * @param value The value to be associated with the key.
     */
    public append(key: string, value: any): void {
        this.vars[key] = value;
    }

    /**
     * Retrieves the value associated with the given key from the conversation variables.
     * @param key The key for which the value is to be retrieved.
     * @returns The value associated with the key, or false if the key is not found.
     */
    public read(key: string): any | false {
        return this.vars[key] || false;
    }


    public log(): void {
        console.log(this.vars)
    }
}