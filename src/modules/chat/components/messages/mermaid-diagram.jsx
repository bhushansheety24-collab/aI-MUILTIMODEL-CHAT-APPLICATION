"use client";
import { useEffect, useState } from "react";

let mermaidInstance = null;
let idCounter = 0;

const MermaidDiagram = ({ chart }) => {
  const [error, setError] = useState(null);
  const [svg, setSvg] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        if (!mermaidInstance) {
          const mermaid = (await import("mermaid")).default;
          mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "loose",
            suppressErrorRendering: true,
          });
          mermaidInstance = mermaid;
        }

        idCounter += 1;
        const id = `mermaid-${Date.now()}-${idCounter}`;

        // Validate syntax first so mermaid never gets to inject its own error DOM
        await mermaidInstance.parse(chart);

        const { svg: renderedSvg } = await mermaidInstance.render(id, chart);

        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Invalid diagram syntax");
        }
      } finally {
        // Clean up any stray error elements mermaid may have injected into the body
        document
          .querySelectorAll('[id^="dmermaid-"], [id^="mermaid-"].error-icon')
          .forEach((el) => {
            if (!el.closest("[data-mermaid-container]")) {
              el.remove();
            }
          });
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        Diagram could not be rendered (invalid syntax).
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 flex justify-center rounded-lg border border-border bg-white p-4">
        <span className="text-xs text-muted-foreground">Loading diagram...</span>
      </div>
    );
  }

  return (
    <div
      data-mermaid-container
      className="my-3 flex justify-center overflow-x-auto rounded-lg border border-border bg-white p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidDiagram;