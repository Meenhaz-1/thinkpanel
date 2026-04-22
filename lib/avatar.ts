export function getInitials(name: string) {
  const cleanedName = name.trim().replace(/\s+/g, " ");
  if (!cleanedName) {
    return "P";
  }

  const parts = cleanedName.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function getPersonaAvatarUrl(name: string) {
  const seed = encodeURIComponent(name.trim() || "Persona");
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}`;
}
