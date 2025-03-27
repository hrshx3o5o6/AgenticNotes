import readline from "readline";

// Main function to initialize and run the chat
async function main() {
    try {
        // Import and initialize AI
        const { initializeAI } = await import("./index.js");
        const executor = await initializeAI();

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Function to handle user input
        const askUser = () => {
            rl.question("You: ", async (query) => {
                if (query.toLowerCase() === "exit") {
                    rl.close();
                    return;
                }

                try {
                    const response = await executor.invoke({ input: query });
                    console.log("AI:", response.output);
                } catch (error) {
                    console.error("❌ Error processing request:", error);
                }

                askUser();
            });
        };

        // Start the chat after initialization
        askUser();
    } catch (error) {
        console.error("❌ Error initializing AI:", error);
        process.exit(1);
    }
}

// Run the main function
main();