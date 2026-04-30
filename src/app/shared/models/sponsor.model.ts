import { SubmissionFormField } from './submissionForm.model';

export interface SponsorTheme {
    fontColor?: string;
    tertiaryColor?: string;
}

export interface Sponsor {
    id?: string;
    name: string;
    imageUrl?: string;
    text?: string;
    theme?: SponsorTheme;
    appendedFields?: SubmissionFormField[];
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt?: Date;
}
