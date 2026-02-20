export type FieldType = 'text' | 'number' | 'dropdown' | 'file' | 'userTag';

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

export interface SubmissionFormField {
  fieldId: string;
  fieldType: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  order: number;
  options?: string[];
  validation?: FieldValidation;
}

export interface SubmissionForm {
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  fields: SubmissionFormField[];
}

export const DEFAULT_SUBMISSION_FIELDS: SubmissionFormField[] = [
  {
    fieldId: 'teamName',
    fieldType: 'text',
    label: 'Team Name',
    placeholder: 'Enter your team name',
    required: true,
    order: 1
  },
  {
    fieldId: 'location',
    fieldType: 'text',
    label: 'Location',
    placeholder: 'Enter your venue/location',
    required: true,
    order: 2
  },
  {
    fieldId: 'score',
    fieldType: 'number',
    label: 'Score',
    placeholder: 'Enter your score',
    required: true,
    order: 3,
    validation: { min: 0, max: 100 }
  },
  {
    fieldId: 'photo',
    fieldType: 'file',
    label: 'Team Photo',
    required: false,
    order: 4,
    validation: {
      maxFileSize: 5 * 1024 * 1024,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp']
    }
  },
  {
    fieldId: 'taggedUsers',
    fieldType: 'userTag',
    label: 'Tag Teammates',
    placeholder: 'Search for teammates...',
    required: false,
    order: 5
  }
];
