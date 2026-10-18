export function relationshipLevel(points: number) {
  if (points >= 200) return { name: "Deep connection", floor: 200, next: 400 };
  if (points >= 80) return { name: "Close companions", floor: 80, next: 200 };
  if (points >= 25) return { name: "Getting closer", floor: 25, next: 80 };
  return { name: "A new beginning", floor: 0, next: 25 };
}

export function connectionProgress(points: number) {
  const level = relationshipLevel(points);
  return Math.min(
    100,
    Math.round(((points - level.floor) / (level.next - level.floor)) * 100),
  );
}
