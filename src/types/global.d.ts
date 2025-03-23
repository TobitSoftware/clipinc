declare module '*.png' {
    const value: string;
    export = value;
}

declare module '*.png?url' {
    const value: string;
    export = value;
}

declare module '*.svg?url' {
    const value: string;
    export = value;
}

declare module '*.json' {
    const value: any;
    export default value;
}
