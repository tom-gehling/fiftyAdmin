import { FormBuilder, Validators, FormControl, FormGroup } from '@angular/forms';

type ControlsOf<T> = {
  [K in keyof T]: FormControl<T[K] | null>;
};

export function buildForm<T>(fb: FormBuilder, model: T): FormGroup<ControlsOf<T>> {
  const controls: any = {};

  for (const key in model) {
    const value = (model as any)[key];

    // Required if property is not optional (basic rule)
    const isRequired = value !== undefined && value !== null;

    controls[key] = fb.control(
      value ?? null,
      isRequired ? Validators.required : []
    );
  }

  return fb.group(controls) as FormGroup<ControlsOf<T>>;
}
