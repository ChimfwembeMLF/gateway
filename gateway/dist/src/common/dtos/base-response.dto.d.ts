export declare class BaseResponseDto<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}
