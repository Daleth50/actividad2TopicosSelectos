import type { Student } from '../types/student';

// Ruta relativa por defecto: Nginx hace el proxy a backend:3000 internamente.
// Solo se usa URL absoluta si VITE_API_URL está definida (ej. desarrollo local sin Docker).
const BASE = import.meta.env.VITE_API_URL ?? '';

export async function getStudents(): Promise<Student[]> {
  const res = await fetch(`${BASE}/students`);
  if (!res.ok) throw new Error('Error al obtener estudiantes');
  return res.json();
}

export async function createStudent(data: Omit<Student, 'StudentId'>): Promise<Student> {
  const res = await fetch(`${BASE}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al crear estudiante');
  return res.json();
}

export async function deleteStudent(id: number): Promise<void> {
  const res = await fetch(`${BASE}/students/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar estudiante');
}
