import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Search } from "lucide-react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";

const PLACEHOLDERS = [
	"schol calc",
	"scholarship phys",
	"l3 complex",
	"Level 3 prob dist",
	"schol bio",
	"schol hist",
	"level 2 bio",
	"L2 genetics",
	"schol chem",
	"LEVEL 3 japanese",
	"spanish l2",
	"schol english",
	"LEVEL 2 PHYSICS",
	"L2 history",
	"91524",
];

interface SearchInputProps {
	query: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onKeyPress: (e: React.KeyboardEvent) => void;
	onSearch: () => void;
}

export default function SearchInput({
	query,
	onChange,
	onKeyPress,
	onSearch,
}: SearchInputProps) {
	const [placeholder, setPlaceholder] = useState(
		() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
	);

	const randomPlaceholder = () =>
		PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.value === "") setPlaceholder(randomPlaceholder());
		onChange(e);
	};
	return (
		<div className="flex gap-2">
			<div className="flex-1 relative">
				<ButtonGroup className="w-full">
					<InputGroup className="w-full">
						<InputGroupInput
							autoFocus
							value={query}
							onChange={handleChange}
							onKeyDown={onKeyPress}
							placeholder={placeholder}
							className="pr-10"
						/>
						<InputGroupAddon>
							<Search />
						</InputGroupAddon>
					</InputGroup>
					<Button onClick={onSearch} variant="outline">
						Search
					</Button>
				</ButtonGroup>
			</div>
		</div>
	);
}
