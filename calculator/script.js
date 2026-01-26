let expression = "";
let exprDisplay = document.getElementById("expression");
let resultDisplay = document.getElementById("result");
let buttons = document.querySelectorAll("button");

buttons.forEach(button => {
    button.addEventListener("click", () => {
        let value = button.innerText;

        if (value === "AC") {
            expression = "";
            exprDisplay.innerText = "";
            resultDisplay.innerText = "0";
        }
        else if (value === "=") {
            try {
                let finalExpr = expression.replace(/x/g, "*");
                let result = eval(finalExpr);
                resultDisplay.innerText = result;
            } catch {
                resultDisplay.innerText = "Error";
            }
        }
        else {
            expression += value;
            exprDisplay.innerText = expression;
        }
    });
});
