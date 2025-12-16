export declare class PaginatedResponseDto<T = any> {
    success: boolean;
    message?: string;
    data?: T[];
    total: number;
    page: number;
    pageSize: number;
}
