import { useEffect, useState } from 'react';
import type { Student } from './types/student';
import { getStudents, createStudent, deleteStudent } from './api/students';
import StudentForm from './components/StudentForm';
import StudentTable from './components/StudentTable';
import './App.css';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchStudents() {
    try {
      setError(null);
      const data = await getStudents();
      setStudents(data);
    } catch {
      setError('No se pudo conectar con la API. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStudents(); }, []);

  async function handleAdd(data: Omit<Student, 'StudentId'>) {
    setSaving(true);
    try {
      const created = await createStudent(data);
      setStudents(prev => [...prev, created]);
    } catch {
      setError('Error al agregar estudiante.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteStudent(id);
      setStudents(prev => prev.filter(s => s.StudentId !== id));
    } catch {
      setError('Error al eliminar estudiante.');
    }
  }

  return (
    <div className="container">
      <h1>Gestión de Estudiantes</h1>
      <p className="subtitle">API: LoopBack 4 · Frontend: React + Vite</p>

      <section className="card">
        <h2>Agregar estudiante</h2>
        <StudentForm onAdd={handleAdd} loading={saving} />
      </section>

      <section className="card">
        <h2>Lista de estudiantes</h2>
        {error && <p className="error">{error}</p>}
        {loading ? <p className="loading">Cargando…</p> : (
          <StudentTable students={students} onDelete={handleDelete} />
        )}
      </section>
    </div>
  );
}
