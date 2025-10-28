import { NativeSelect } from "@chakra-ui/react";
import type {ChangeEvent} from "react";

interface Props<T extends string | number> {
    value: T;
    setValue: (val: T) => void;
    options: T[];
    defaultValue?: T;
}

const GenericSelector = <T extends string | number>({ value, setValue, options, defaultValue }: Props<T>) => {
    return (
        <NativeSelect.Root width="auto" minW="fit-content">
            <NativeSelect.Field
                value={value}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setValue(e.target.value as T)}
                defaultValue={defaultValue}
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
        </NativeSelect.Root>
    );
};

export default GenericSelector;