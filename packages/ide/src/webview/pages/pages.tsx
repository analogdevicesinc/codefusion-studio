/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/**
 * @param path - page path as defined in `src\webview\constants.ts`
 * @param linkText - text shown while representing the page
 * @param icon - the svg element to be used as an icon.
 */
export class Page {
  path: string;
  linkText: string;
  icon: () => React.JSX.Element;

  constructor(path: string, linkText: string, icon: () => React.JSX.Element) {
    this.path = path;
    this.linkText = linkText;
    this.icon = icon;
  }
}

export class PageList {
  protected static instance: PageList | null = null;

  pageMap: Map<string, Page>;

  private constructor() {
    this.pageMap = new Map();
  }

  static getInstance() {
    if (PageList.instance === null) {
      PageList.instance = new PageList();
    }

    return PageList.instance;
  }

  getPages() {
    return Array.from(this.pageMap.values());
  }

  addPages(pages: Page | Page[]) {
    if (Array.isArray(pages)) {
      pages.forEach((page: Page) => {
        this.pageMap.set(page.linkText, page);
      });
    } else {
      this.pageMap.set(pages.linkText, pages);
    }
  }
}
