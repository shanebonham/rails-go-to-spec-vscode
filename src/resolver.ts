interface CustomMapping {
	pattern: string;
	target: string;
}

// For any given file return a list of possible matches
export function getRelated(file: string, customMappings: CustomMapping[] = []): string[] {
	// Try custom mappings first
	const customResults = tryCustomMappings(file, customMappings);
	if (customResults.length > 0) {
		return customResults;
	}

	// Fallback to default logic
	if (isSpec(file)) {
		return specToCode(file);
	} else {
		return codeToSpec(file);
	}
}

export function isSpec(file: string): boolean {
	return file.indexOf("_spec.rb") > -1;
}

function codeToSpec(file: string): string[] {
	const withSpecExt = addSpecExtension(file);
	return switchToSpecDir(withSpecExt);
}

function specToCode(file: string): string[] {
	const withoutSpecExt = removeSpecExtension(file);
	return switchToCodeDir(withoutSpecExt);
}

function switchToSpecDir(file: string): string[] {
	if (file.includes("/app/controllers/")) {
		return [
			file.replace("/app/controllers/", "/spec/requests/"),
			file.replace("/app/controllers/", "/spec/controllers/"),
		];
	} else if (file.includes("/app/app/")) {
		return [
			file.replace("/app/app/", "/app/spec/"),
		];
	} else if (file.includes("/app/")) {
		return [
			file.replace("/app/", "/spec/"),
		];
	} else if (file.includes("/lib/")) {
		return [
			file.replace("/lib/", "/spec/lib/"),
		];
	} else {
		return [];
	}
}

function switchToCodeDir(file: string): string[] {
	if (file.includes("/spec/config/initializers/")) {
		return [
			file.replace("/spec/", "/"),
		];
	} else if (file.includes("/spec/lib/")) {
		return [
			file.replace("/spec/", "/"),
			file.replace("/spec/", "/app/"),
		];
	} else if (file.includes("/spec/requests/")) {
		return [
			file.replace("/spec/requests/", "/app/controllers/"),
		];
	} else {
		return [
			file.replace("/spec/", "/app/"),
		];
	}
}

function isViewFile(file: string): boolean {
	const viewRegex = /.erb$|.haml$|.slim$/;
	return viewRegex.test(file);
}

function addSpecExtension(file: string): string {
	if (isViewFile(file)) {
		return file
			.replace(".erb", ".erb_spec.rb")
			.replace(".haml", ".haml_spec.rb")
			.replace(".slim", ".slim_spec.rb");
	} else {
		return file.replace(".rb", "_spec.rb");
	}
}

function tryCustomMappings(file: string, customMappings: CustomMapping[]): string[] {
	const results: string[] = [];

	for (const mapping of customMappings) {
		// Try forward mapping (pattern → target)
		const forwardMatch = tryMappingDirection(file, mapping.pattern, mapping.target);
		if (forwardMatch) {
			const absoluteTarget = convertToAbsolutePath(file, forwardMatch);
			results.push(absoluteTarget);
		}

		// Try reverse mapping: convert target template to regex pattern
		const reversePattern = convertTargetToPattern(mapping.target);
		const reverseTargetTemplate = convertPatternToTarget(mapping.pattern);
		const reverseMatch = tryMappingDirection(file, reversePattern, reverseTargetTemplate);
		if (reverseMatch) {
			const absoluteTarget = convertToAbsolutePath(file, reverseMatch);
			results.push(absoluteTarget);
		}
	}

	return results;
}

function convertTargetToPattern(target: string): string {
	// Convert target template like "spec/lib/tasks/$1_rake_spec.rb"
	// to regex pattern like ".*/spec/lib/tasks/(.+)_rake_spec\.rb$"
	let pattern = target
		.replace(/\./g, '\\.')  // Escape dots
		.replace(/\$(\d+)/g, '(.+)');  // Replace $1, $2, etc. with capture groups

	return `.*/${pattern}$`;
}

function convertPatternToTarget(pattern: string): string {
	// Convert regex pattern like ".*/lib/tasks/(.+)\.rake$"
	// to target template like "lib/tasks/$1.rake"
	let target = pattern
		.replace(/^\.\*\//, '')  // Remove leading .*/
		.replace(/\$$/, '')      // Remove trailing $
		.replace(/\\\./g, '.');  // Unescape dots

	// Replace capture groups with $1, $2, etc.
	let groupCounter = 1;
	target = target.replace(/\([^)]*\)/g, () => `$${groupCounter++}`);

	return target;
}

function tryMappingDirection(file: string, pattern: string, target: string): string | null {
	const regex = new RegExp(pattern);
	const match = file.match(regex);

	if (match) {
		// Replace $1, $2, etc. with captured groups
		let result = target;
		for (let i = 1; i < match.length; i++) {
			result = result.replace(new RegExp(`\\$${i}`, 'g'), match[i]);
		}
		return result;
	}

	return null;
}

function convertToAbsolutePath(currentFile: string, relativePath: string): string {
	// Find the workspace root by looking for the part before /app/, /spec/, or /lib/
	const rootMatch = currentFile.match(/(.*?)\/(?:app|spec|lib)\//);
	if (rootMatch) {
		const workspaceRoot = rootMatch[1];
		return `${workspaceRoot}/${relativePath}`;
	}
	// Fallback: assume current directory structure
	return relativePath;
}


function removeSpecExtension(file: string): string {
	return file
		.replace(".erb_spec.rb", ".erb")
		.replace(".haml_spec.rb", ".haml")
		.replace(".slim_spec.rb", ".slim")
		.replace("_spec.rb", ".rb");
}
