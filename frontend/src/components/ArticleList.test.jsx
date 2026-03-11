import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArticleList from "./ArticleList";

const noop = () => {};

describe("ArticleList", () => {
  it("記事が空かつ管理者のとき「今すぐ取得」を表示する", () => {
    render(
      <ArticleList
        articles={[]}
        onTagClick={noop}
        selectedTag={null}
        showAll
        readIds={new Set()}
        bookmarkedIds={new Set()}
        onRead={noop}
        onBookmark={noop}
        isAdmin={true}
      />
    );
    expect(screen.getByText(/今すぐ取得/)).toBeInTheDocument();
  });

  it("記事が空かつ非管理者のとき「毎朝7時に自動取得」を表示する", () => {
    render(
      <ArticleList
        articles={[]}
        onTagClick={noop}
        selectedTag={null}
        showAll
        readIds={new Set()}
        bookmarkedIds={new Set()}
        onRead={noop}
        onBookmark={noop}
        isAdmin={false}
      />
    );
    expect(screen.getByText(/毎朝7時に自動取得/)).toBeInTheDocument();
  });

  it("記事が空かつゲスト(isAdmin未指定)のとき「毎朝7時に自動取得」を表示する", () => {
    render(
      <ArticleList
        articles={[]}
        onTagClick={noop}
        selectedTag={null}
        showAll
        readIds={new Set()}
        bookmarkedIds={new Set()}
        onRead={noop}
        onBookmark={noop}
      />
    );
    expect(screen.getByText(/毎朝7時に自動取得/)).toBeInTheDocument();
  });

  it("emptyMessageが渡されたときそれを表示する", () => {
    render(
      <ArticleList
        articles={[]}
        onTagClick={noop}
        selectedTag={null}
        showAll
        readIds={new Set()}
        bookmarkedIds={new Set()}
        onRead={noop}
        onBookmark={noop}
        isAdmin={true}
        emptyMessage="カスタムメッセージ"
      />
    );
    expect(screen.getByText("カスタムメッセージ")).toBeInTheDocument();
  });
});
