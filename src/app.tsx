import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { FilePageRoute } from "@/pages/file-page-route";
import { ImageLibraryPage } from "@/pages/image-library-page";
import { NotFound } from "@/pages/not-found";
import { Providers } from "@/providers";
import { ThemeLibraryPage } from "@/pages/theme-library-page";
import { WelcomePage } from "@/pages/welcome-page";

const App = (): JSX.Element => (
  <BrowserRouter>
    <Providers>
      <Routes>
        <Route path="/" element={<Navigate to="/p/README.md" replace />} />
        <Route element={<AppShell />}>
          <Route path="/p/*" element={<FilePageRoute />} />
          <Route path="/i" element={<ImageLibraryPage />} />
          <Route path="/i/:filename" element={<ImageLibraryPage />} />
          <Route path="/t" element={<ThemeLibraryPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Providers>
  </BrowserRouter>
);

export { App };
