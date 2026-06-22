import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { registerMermaidIcons } from "@/lib/register-mermaid-icons";
import {
  COMPONENTS_SLIDE,
  REHYPE_PLUGINS,
} from "@/components/editor/markdown/streamdown-components";
import useMountEffect from "@/hooks/use-mount-effect";

interface SlideStreamdownProps {
  value: string;
}

const SlideStreamdown = (allProps: SlideStreamdownProps): JSX.Element => {
  const { value } = allProps;

  useMountEffect(() => {
    void registerMermaidIcons();
  });

  return (
    <Streamdown
      mode="static"
      plugins={{ cjk, code, math, mermaid }}
      shikiTheme={["github-light", "github-dark"]}
      linkSafety={{ enabled: false }}
      components={COMPONENTS_SLIDE}
      rehypePlugins={REHYPE_PLUGINS}
    >
      {value}
    </Streamdown>
  );
};

export default SlideStreamdown;
