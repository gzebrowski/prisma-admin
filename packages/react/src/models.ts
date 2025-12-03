export type ErrorData = {
    message: string | null | undefined;
    main: Record<string, string> | null | undefined;
    inlines: Record<string, Record<string, string>> | null | undefined;
}
