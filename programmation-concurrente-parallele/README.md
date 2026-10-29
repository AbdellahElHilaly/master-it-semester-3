# S3 PAR Lab

Learning-by-doing repository for **Programmation concurrente et parallèle**.

## Structure

- `01-basics/` — sequential foundations and small benchmarks
- `02-threads/` — threads and shared-memory concurrency
- `03-processes/` — processes and communication
- `04-openmp/` — OpenMP experiments
- `05-mpi/` — MPI experiments
- `experiments/` — focused measurements and comparisons
- `notes/` — concise learning notes and conclusions

## Working loop

1. Choose one concept from the PAR study plan.
2. Add a small reproducible example.
3. Run it and record the observation in `notes/`.
4. Commit the result with a focused message.

This lab is separate from `Shared materials`: documents stay in Drive, while code and its history stay in Git.

## Documentation app

The reusable study notebook lives in `documentation/`. It provides navigation, themes, French-first lessons with Arabic support, module listing, practice notes, and a local SQLite configuration store.

```powershell
cd documentation
npm start
```

## Notion

The Notion PAR module page is the study dashboard. It should link to this repository and record completed experiments, not duplicate the source code.

This module is part of the shared semester repository.

Parent repository: https://github.com/AbdellahElHilaly/master-it-semester-3
