export interface GlobalSearchResult {
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
}
