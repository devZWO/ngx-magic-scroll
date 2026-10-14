import { Component, computed, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { PARAM_HELP_INFO, ParamHelpInfo } from './param-help.data';

@Component({
  selector: 'app-param-help',
  imports: [MatIconButton, MatMenu, MatMenuTrigger],
  host: {
    class: 'param-help-host',
  },
  template: `
    <button
      type="button"
      mat-icon-button
      [matMenuTriggerFor]="helpMenu"
      [attr.aria-label]="ariaLabel()"
      class="param-help-btn"
    >
      <svg
        class="help-icon"
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
      >
        <path
          d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"
        />
      </svg>
    </button>

    <mat-menu #helpMenu="matMenu" class="param-help-menu" xPosition="after">
      <div class="param-help-popover">
        @if (info(); as item) {
          <div class="popover-header">
            <h3 class="popover-title">{{ item.title }}</h3>
            @if (item.propertyKey) {
              <code class="property-badge">{{ item.propertyKey }}</code>
            }
          </div>

          <p class="popover-summary">{{ item.summary }}</p>

          <div class="popover-block impact-block">
            <span class="block-label">Behavioral impact</span>
            <p class="impact-text">{{ item.impact }}</p>
          </div>

          <div class="popover-block scopes-block">
            <span class="block-label">Configurable in</span>
            <div class="scopes-list">
              @for (scope of item.scopes; track scope) {
                <span class="scope-pill" [attr.data-scope]="scope">{{ scope }}</span>
              }
            </div>
          </div>

          @if (item.docLinks.length > 0) {
            <div class="popover-block docs-block">
              <span class="block-label">Documentation</span>
              <ul class="doc-links">
                @for (link of item.docLinks; track link.url) {
                  <li>
                    <a [href]="link.url" target="_blank" rel="noopener noreferrer" class="doc-link">
                      <span>{{ link.label }}</span>
                      <svg
                        aria-hidden="true"
                        class="ext-icon"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="currentColor"
                      >
                        <path
                          d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"
                        />
                      </svg>
                    </a>
                  </li>
                }
              </ul>
            </div>
          }
        } @else {
          <p class="missing-info">No description available for '{{ paramId() }}'.</p>
        }
      </div>
    </mat-menu>
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
      align-items: center;
    }

    .param-help-btn {
      width: 24px;
      height: 24px;
      padding: 0;
      min-width: 24px;
      line-height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #607289;
      border-radius: 50%;
      border: none;
      background: transparent;
      cursor: pointer;
      transition:
        color 0.15s ease,
        background-color 0.15s ease;

      &:hover,
      &:focus-visible {
        color: #0369a1;
        background-color: rgba(3, 105, 161, 0.08);
      }

      &:focus-visible {
        outline: 2px solid #0369a1;
        outline-offset: 1px;
      }
    }

    .help-icon {
      display: block;
    }

    .param-help-popover {
      max-width: 320px;
      padding: 14px 16px;
      color: #203047;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      box-sizing: border-box;
      cursor: default;
    }

    .popover-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }

    .popover-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }

    .property-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #0369a1;
      background: #f0f9ff;
      padding: 2px 6px;
      border-radius: 4px;
      width: fit-content;
      border: 1px solid #bae6fd;
    }

    .popover-summary {
      margin: 0 0 10px 0;
      color: #334155;
    }

    .popover-block {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
    }

    .block-label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .impact-text {
      margin: 0;
      color: #334155;
      font-size: 12px;
    }

    .scopes-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .scope-pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #1e293b;
      border: 1px solid #cbd5e1;
    }

    .doc-links {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .doc-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #0284c7;
      text-decoration: none;
      font-weight: 500;
      font-size: 12px;

      &:hover {
        text-decoration: underline;
        color: #0369a1;
      }
    }

    .ext-icon {
      flex-shrink: 0;
    }

    .missing-info {
      margin: 0;
      color: #64748b;
      font-style: italic;
    }
  `,
})
export class ParamHelpButton {
  readonly paramId = input.required<string>();

  readonly info = computed<ParamHelpInfo | undefined>(() => PARAM_HELP_INFO[this.paramId()]);

  readonly ariaLabel = computed(() => {
    return `Help for ${this.paramId()}`;
  });
}
