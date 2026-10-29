# S3 Documentation Template

Reusable Node.js documentation notebook for the PAR module and future S3 modules.

## Run

```powershell
cd documentation
npm start
```

Open `http://127.0.0.1:4173`.

The app uses Node's built-in `node:sqlite` API (Node 22.5+). It stores local settings and practice samples in `.data/documentation.sqlite`, which is ignored by Git.

## Design rules

- French is the primary course language.
- Arabic translations are smaller and right-to-left.
- English is reserved for technical identifiers.
- The navigation displays one documentation section at a time.
- The same template can list every S3 module and later receive module-specific content.
