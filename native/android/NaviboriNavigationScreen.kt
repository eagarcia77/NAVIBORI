package com.navibori.car

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.Action
import androidx.car.app.model.MessageTemplate
import androidx.car.app.model.Template

class NaviboriNavigationScreen(
    carContext: CarContext
) : Screen(carContext) {
    override fun onGetTemplate(): Template =
        MessageTemplate.Builder(
            "NAVIBORI native navigation foundation. Route preview will consume the shared /api/routing contract."
        )
            .setTitle("NAVIBORI")
            .setHeaderAction(Action.APP_ICON)
            .build()
}
