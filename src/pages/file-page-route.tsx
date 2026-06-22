import FilePage from "@/pages/file-page";
import { useParams } from "react-router-dom";

const FilePageRoute = (): JSX.Element => {
  const { "*": rawPath = "" } = useParams();
  // Key only on rawPath so user state transitions (loading -> authenticated)
  // don't remount the editor and trigger a wasteful WS leave/join dance.
  return <FilePage key={rawPath} />;
};

export default FilePageRoute;
