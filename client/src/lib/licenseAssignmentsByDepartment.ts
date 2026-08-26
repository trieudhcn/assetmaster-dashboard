export type DepartmentAssignment = { status: string; userId: number | null };
export type DepartmentUser = { id: number; departmentId: number | null };
export type DepartmentRecord = { id: number; name: string };

export function buildLicenseAssignmentsByDepartment(assignments: DepartmentAssignment[], users: DepartmentUser[], departments: DepartmentRecord[]) {
  const departmentsById = new Map(departments.map((department) => [department.id, department]));
  const usersById = new Map(users.map((user) => [user.id, user]));
  const totals = new Map<number | "unassigned", number>();

  assignments.filter((assignment) => assignment.status === "active").forEach((assignment) => {
    const departmentId = assignment.userId ? usersById.get(assignment.userId)?.departmentId ?? "unassigned" : "unassigned";
    totals.set(departmentId, (totals.get(departmentId) || 0) + 1);
  });

  return [...totals.entries()].map(([departmentId, assigned]) => ({
    departmentId,
    name: departmentId === "unassigned" ? "Chưa gán phòng ban" : departmentsById.get(departmentId)?.name || `Phòng ban #${departmentId}`,
    assigned,
  })).sort((left, right) => right.assigned - left.assigned || (left.departmentId === "unassigned" ? 1 : right.departmentId === "unassigned" ? -1 : left.name.localeCompare(right.name, "vi")));
}
