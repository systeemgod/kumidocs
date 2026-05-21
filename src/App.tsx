import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { FilePageRoute } from "@/pages/FilePageRoute";
import { ImageLibraryPage } from "@/pages/ImageLibraryPage";
import { NotFound } from "@/pages/NotFound";
import { Providers } from "@/Providers";
import { ThemeLibraryPage } from "@/pages/ThemeLibraryPage";
import { WelcomePage } from "@/pages/WelcomePage";

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
