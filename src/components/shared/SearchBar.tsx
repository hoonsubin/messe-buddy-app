// Phase 1 shell - logic wired in Phase 2+.
import { MdSearch } from "react-icons/md";

interface SearchBarProps {
  readonly placeholder: string;
  readonly onSearch: (query: string) => void;
}

const SearchBar = (props: SearchBarProps) => (
  <div className="search-bar" data-testid="search-bar" role="search">
    <MdSearch size={18} aria-hidden="true" />
    <input
      type="search"
      className="search-bar__input"
      placeholder={props.placeholder}
      aria-label={props.placeholder}
      onChange={(e) =>
        props.onSearch(e.target.value)}
    />
  </div>
);

export default SearchBar;
