export interface Tea {
    id: number;
    name: string;
    year?: number;
    type: string;
    seller?: string;
    origin?: string;
    price?: number;
    averageRating: number;
    reviewCount: number;
}
export interface RatingSchema {
    id: number;
    code: string;
    version: string;
    nameKo: string;
    nameEn: string;
    descriptionKo?: string | null;
    descriptionEn?: string | null;
    overallMinValue: number;
    overallMaxValue: number;
    overallStep: number;
    isActive: boolean;
}
export interface RatingAxis {
    id: number;
    schemaId: number;
    code: string;
    nameKo: string;
    nameEn: string;
    descriptionKo?: string | null;
    descriptionEn?: string | null;
    minValue: number;
    maxValue: number;
    stepValue: number;
    displayOrder: number;
    isRequired: boolean;
    teaType?: string | null;
}
export interface AxisValue {
    axisId: number;
    value: number;
}
export interface Note {
    id: number;
    teaId: number;
    teaName: string;
    userId: number;
    userName: string;
    schemaId: number;
    schema?: RatingSchema;
    overallRating: number | null;
    isRatingIncluded: boolean;
    axisValues?: Array<{
        axisId: number;
        valueNumeric: number;
        axis?: RatingAxis;
    }>;
    memo: string | null;
    images?: string[] | null;
    imageThumbnails?: string[] | null;
    tags?: string[] | null;
    isPublic: boolean;
    createdAt: Date;
    likeCount?: number;
    isLiked?: boolean;
    isBookmarked?: boolean;
}
export interface User {
    id: number;
    name: string;
    email: string | null;
}
export declare enum PostCategory {
    BREWING_QUESTION = "brewing_question",
    RECOMMENDATION = "recommendation",
    DISCUSSION = "discussion",
    TEA_REVIEW = "tea_review",
    TOOL_REVIEW = "tool_review",
    TEA_ROOM_REVIEW = "tea_room_review",
    ANNOUNCEMENT = "announcement",
    BUG_REPORT = "bug_report"
}
