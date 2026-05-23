import FilePage from "@/pages/file-page";
import { useParams } from "react-router-dom";
import { useUser } from "@/store/user";

const FilePageRoute = (): JSX.Element => {
  const { "*": rawPath = "" } = useParams();
  const { user, loading } = useUser();
  let userKey = "anon";
  if (loading) {
    userKey = "loading";
  }
  if (!loading && user) {
    userKey = user.id;
  }
  return <FilePage key={`${rawPath}-${userKey}`} />;
};

export default FilePageRoute;
