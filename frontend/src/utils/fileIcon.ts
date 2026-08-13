export function fileIcon(name: string): { icon: string; color: string } {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'tf' || ext === 'tfvars' || ext === 'hcl') return { icon: 'terminal', color: '#8B5CF6' };
  if (ext === 'json') return { icon: 'data_object', color: '#E8612D' };
  if (ext === 'xml' || ext === 'vxml') return { icon: 'description', color: '#E8612D' };
  if (ext === 'zip') return { icon: 'folder_zip', color: '#8B5CF6' };
  if (ext === 'csv') return { icon: 'table_chart', color: '#10B981' };
  if (ext === 'wav' || ext === 'mp3') return { icon: 'graphic_eq', color: '#3B82F6' };
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'webp') return { icon: 'image', color: '#3B82F6' };
  return { icon: 'insert_drive_file', color: '#6B7280' };
}
