import { ArrowLeftRegular } from "@fluentui/react-icons";
import { Button } from "@/components/ui/button";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import { useNavigate, useOutletContext } from "react-router-dom";
import useMountEffect from "@/hooks/use-mount-effect";

interface OutletCtx {
  instanceName: string;
}

const NotFound = (): JSX.Element => {
  const navigate = useNavigate();
  const { instanceName } = useOutletContext<OutletCtx>();

  useMountEffect(() => {
    document.title = `Page Not Found | ${instanceName}`;
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="text-5xl">
        <EmojiIcon emoji="🔍" size="1em" />
      </div>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-foreground text-sm max-w-xs">
        The path you navigated to doesn't match any known route.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          void navigate("/p/README.md");
        }}
      >
        <ArrowLeftRegular className="mr-2 w-4 h-4" />
        Go to home
      </Button>
    </div>
  );
};

export default NotFound;
