import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const baseClasses = {
  popup: 'app-dialog',
  title: 'app-dialog-title',
  htmlContainer: 'app-dialog-content',
  confirmButton: 'app-dialog-confirm',
  cancelButton: 'app-dialog-cancel',
  denyButton: 'app-dialog-deny',
  input: 'app-dialog-input',
};

export async function confirmDialog(options: {
  title: string;
  text?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    html: options.html,
    icon: options.danger ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Confirmar',
    cancelButtonText: options.cancelText ?? 'Cancelar',
    reverseButtons: true,
    buttonsStyling: false,
    customClass: {
      ...baseClasses,
      confirmButton: options.danger ? 'app-dialog-confirm app-dialog-danger' : 'app-dialog-confirm',
    },
  });

  return result.isConfirmed;
}

export async function choiceDialog(options: {
  title: string;
  html: string;
  confirmText: string;
  denyText: string;
  cancelText?: string;
}): Promise<'confirm' | 'deny' | 'cancel'> {
  const result = await Swal.fire({
    title: options.title,
    html: options.html,
    icon: 'question',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: options.confirmText,
    denyButtonText: options.denyText,
    cancelButtonText: options.cancelText ?? 'Cancelar',
    reverseButtons: true,
    buttonsStyling: false,
    customClass: baseClasses,
  });

  if (result.isConfirmed) return 'confirm';
  if (result.isDenied) return 'deny';
  return 'cancel';
}

export async function inputDialog(options: {
  title: string;
  label: string;
  value?: string;
  placeholder?: string;
  confirmText?: string;
}): Promise<string | null> {
  const result = await Swal.fire<string>({
    title: options.title,
    input: 'url',
    inputLabel: options.label,
    inputValue: options.value ?? '',
    inputPlaceholder: options.placeholder,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Guardar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    buttonsStyling: false,
    customClass: baseClasses,
  });

  return result.isConfirmed ? result.value?.trim() ?? '' : null;
}

export async function contentDialog(options: {
  title: string;
  html: string;
  confirmText?: string;
}): Promise<void> {
  await Swal.fire({
    title: options.title,
    html: options.html,
    confirmButtonText: options.confirmText ?? 'Cerrar',
    buttonsStyling: false,
    customClass: {
      ...baseClasses,
      popup: 'app-dialog app-dialog-wide',
    },
  });
}
