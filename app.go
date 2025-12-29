package main

import (
    "embed"

    "github.com/wailsapp/wails/v2"
    "github.com/wailsapp/wails/v2/pkg/options"
    "github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/src
var assets embed.FS

func main() {
    // Create the application with our options
    err := wails.Run(&options.App{
        Title:  "Reaction Time Tester",
        Width:  1280,
        Height: 800,
        MinWidth:  1000,
        MinHeight: 600,
        WindowStartState: options.Maximised,
        AssetServer: &assetserver.Options{
            Assets: assets,
        },
    })

    if err != nil {
        println("Error:", err.Error())
    }
}