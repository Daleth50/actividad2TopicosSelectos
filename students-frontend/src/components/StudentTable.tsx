import type { Student } from '../types/student';

interface Props {
  students: Student[];
  onDelete: (id: number) => void;
}

export default function StudentTable({ students, onDelete }: Props) {
  if (students.length === 0) {
    return <p className="empty">No hay estudiantes registrados.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>No. Control</th>
          <th>Nombre</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {students.map(s => (
          <tr key={s.StudentId}>
            <td>{s.StudentId}</td>
            <td>{s.controlNumber}</td>
            <td>{s.Name}</td>
            <td>
              <button
                className="delete-btn"
                onClick={() => s.StudentId !== undefined && onDelete(s.StudentId)}
              >
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
