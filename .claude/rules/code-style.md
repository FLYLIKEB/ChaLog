# Code Style

## Frontend (React + TypeScript)

* **Component Pattern**: Use functional components and hooks only.
* **Import Alias**: Use `@/` to reference the `src/` directory.
* **Class Merging**: Use the `cn()` utility from `components/ui/utils.ts` for Tailwind class management.
* **Type Safety**: Enable TypeScript strict mode — strictly prohibit the use of `any`.
* **UI Standards**: Follow **shadcn/ui** patterns. **Extract components** if they are reused 3+ times or if the class list becomes excessively long.
* **Styling Rules**: Avoid **Arbitrary Values** (e.g., `h-[123px]`); prioritize theme tokens and standard Tailwind classes.
* **User Feedback**: Always provide notifications via `sonner` or `toast` for all **Mutation operations** (Create, Update, Delete) upon success or failure.
* **Directory Structure**: Keep components in `src/components/` and pages in `src/pages/`.

## Backend (NestJS)

* **Architecture**: Use Dependency Injection (DI) with `@Injectable()`. Adhere to the **Controller → Service → Entity** pattern.
* **Validation**: Use **DTOs** (Data Transfer Objects) for all input validation.
* **Error Handling**: Utilize NestJS built-in exceptions (e.g., `NotFoundException`, `BadRequestException`).
* **Module Structure**: Organize by feature: `backend/src/{module}/`.

## General

* **Readability**: No unnecessary comments — ensure the code is self-explanatory.
* **Logging**: Strictly prohibit `console.log` in committed code (use the **NestJS Logger** for backend logs).
* **Commit Messages**: Write in Korean following the convention:
* `feat: #issue_number description`
* `fix: #issue_number description`