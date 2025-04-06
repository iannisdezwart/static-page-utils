import { readFileSync } from "fs";

export const importJs = async (path: string) => /* html */ `
<script>
	${readFileSync(path, "utf-8")}
</script>
`;
