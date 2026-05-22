import { useState } from 'react';
import type { Student } from '../types/student';

interface Props {
  onAdd: (student: Omit<Student, 'StudentId'>) => void;
  loading: boolean;
}

export default function StudentForm({ onAdd, loading }: Props) {
  const [form, setForm] = useState({ controlNumber: '', Name: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.controlNumber.trim() || !form.Name.trim()) return;
    onAdd(form);
    setForm({ controlNumber: '', Name: '' });
  }

  return (
    <form onSubmit={handleSubmit} className="student-form">
      <input
        placeholder="Número de control"
        value={form.controlNumber}
        onChange={e => setForm(f => ({ ...f, controlNumber: e.target.value }))}
        required
      />
      <input
        placeholder="Nombre completo"
        value={form.Name}
        onChange={e => setForm(f => ({ ...f, Name: e.target.value }))}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Guardando…' : 'Agregar'}
      </button>
    </form>
  );
}
