export function showModal(id: string) {
  const modal = document.getElementById(id) as HTMLDialogElement;
  if (modal) {
    modal.showModal();
  }
}

export function hideModal(id: string) {
  const modal = document.getElementById(id) as HTMLDialogElement;
  if (modal) {
    modal.close();
  }
}
