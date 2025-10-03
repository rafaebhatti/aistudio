
export enum LogEntryType {
    Info = 'info',
    Warning = 'warning',
    Error = 'error',
    Success = 'success',
    System = 'system',
}

export interface LogEntry {
    message: string;
    type: LogEntryType;
    timestamp: Date;
}

export interface ReceiverData {
    secret: string;
    note: string;
    timestamp: Date;
}
