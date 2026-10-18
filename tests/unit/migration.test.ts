import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
it("upgrades a populated v1 database without losing characters, chats or relationship points", () => {
  const database = new DatabaseSync(":memory:");
  const migrations = readdirSync("prisma/migrations")
    .filter((name) => !name.endsWith(".toml"))
    .sort();
  database.exec(
    readFileSync(
      path.join("prisma/migrations", migrations[0], "migration.sql"),
      "utf8",
    ),
  );
  database.exec(`INSERT INTO Character (id,name,bio,personality,interests,updatedAt) VALUES ('existing','Kept character','Existing biography','Warm & thoughtful','Yoga',CURRENT_TIMESTAMP);
 INSERT INTO Relationship (id,characterId,points) VALUES ('relation','existing',80);
 INSERT INTO Message (id,characterId,role,content) VALUES ('message','existing','user','An existing private conversation');`);
  for (const name of migrations.slice(1))
    database.exec(
      readFileSync(
        path.join("prisma/migrations", name, "migration.sql"),
        "utf8",
      ),
    );
  expect(
    database
      .prepare("SELECT name, profile FROM Character WHERE id='existing'")
      .get(),
  ).toMatchObject({ name: "Kept character", profile: "{}" });
  expect(
    database.prepare("SELECT content FROM Message WHERE id='message'").get(),
  ).toMatchObject({ content: "An existing private conversation" });
  expect(
    database
      .prepare("SELECT points FROM Relationship WHERE id='relation'")
      .get(),
  ).toMatchObject({ points: 80 });
  database.close();
});
