import Swal from 'sweetalert2'

export const Alert = Swal
export function notifySuccess(title: string, text?: string) {
  return Swal.fire({ title, text, icon: 'success', timer: 1400, showConfirmButton: false })
}
export function notifyError(title: string, text?: string) {
  return Swal.fire({ title, text, icon: 'error' })
}
export function confirmDelete(title: string, text?: string) {
  return Swal.fire({
    title, text, icon: 'warning',
    showCancelButton: true, confirmButtonText: 'Yes, delete it', confirmButtonColor: '#d32f2f'
  })
}