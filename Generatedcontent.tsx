/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */
import React, { useEffect, useRef } from 'react';
import { InteractionData } from '../types';

interface GeneratedContentProps {
  htmlContent: string;
  onInteract: (data: InteractionData) => void;
  appContext: string | null;
  isLoading: boolean;
}

export const GeneratedContent: React.FC<GeneratedContentProps> = ({
  htmlContent,
  onInteract,
  appContext,
  isLoading,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const processedHtmlContentRef = useRef<string | null>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      let target = event.target as HTMLElement | null;

      while (
        target &&
        target !== container &&
        !target.dataset.interactionId
      ) {
        target = target.parentElement;
      }

      if (target?.dataset.interactionId) {
        event.preventDefault();

        let interactionValue = target.dataset.interactionValue;

        if (target.dataset.valueFrom) {
          const input = document.getElementById(
            target.dataset.valueFrom
          ) as HTMLInputElement | HTMLTextAreaElement | null;

          if (input) {
            interactionValue = input.value;
          }
        }

        const interactionData: InteractionData = {
          id: target.dataset.interactionId,
          type: target.dataset.interactionType || 'generic_click',
          value: interactionValue,
          elementType: target.tagName.toLowerCase(),
          elementText:
            (target.innerText ||
              (target as HTMLInputElement).value ||
              '')
              .trim()
              .substring(0, 75),
          appContext,
        };

        onInteract(interactionData);
      }
    };

    container.addEventListener('click', handleClick);

    const executeScriptsSafely = () => {
      const scripts = Array.from(container.getElementsByTagName('script'));

      scripts.forEach((oldScript) => {
        try {
          const newScript = document.createElement('script');

          Array.from(oldScript.attributes).forEach((attr) =>
            newScript.setAttribute(attr.name, attr.value)
          );

          newScript.text = oldScript.innerHTML;

          if (oldScript.parentNode) {
            oldScript.parentNode.replaceChild(newScript, oldScript);
          } else {
            console.warn('Script tag without parent node:', oldScript);
          }
        } catch (error) {
          console.error('Script execution error:', {
            scriptPreview:
              oldScript.innerHTML.substring(0, 500) +
              (oldScript.innerHTML.length > 500 ? '...' : ''),
            error,
          });
        }
      });
    };

    if (!isLoading) {
      if (htmlContent !== processedHtmlContentRef.current) {
        executeScriptsSafely();
        processedHtmlContentRef.current = htmlContent;
      }
    } else {
      processedHtmlContentRef.current = null;
    }

    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [htmlContent, onInteract, appContext, isLoading]);

  return (
    <div
      ref={contentRef}
      className="w-full h-full overflow-y-auto"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};