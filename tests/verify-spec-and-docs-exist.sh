#!/bin/sh

errors_found=0
tasks=$(find ./tasks -type f)

for f in $tasks; do
    testFilePath=$(echo $f | sed -e "s,/tasks,/tests/tasks," -e "s,\.js,-spec\.js,")
    docsFilePath=$(echo $f | sed -e "s,/tasks,/docs," -e "s,\.js,\.md,")

    if [ ! -e $testFilePath ]; then
        echo "Expected test file not found: \"$testFilePath\" (from \"$f\")"
        errors_found=1
    fi

    if [ ! -e $docsFilePath ]; then
        echo "Expected docs file not found: \"$docsFilePath\" (from \"$f\")"
        errors_found=1
    fi

    if ! cat README.md | grep $docsFilePath --quiet
    then
        echo "Expeced README.md to link to \"$docsFilePath\""
        errors_found=1
    fi
done

exit $errors_found
