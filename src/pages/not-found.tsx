import { ArrowLeftRegular } from "@fluentui/react-icons";
import { Button } from "@/components/ui/button";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import { useNavigate } from "react-router-dom";

const NotFound = (): JSX.Element => {
  const navigate = useNavigate();
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
